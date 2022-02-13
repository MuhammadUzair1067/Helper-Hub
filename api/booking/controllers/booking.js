const { parseMultipartData, sanitizeEntity } = require('strapi-utils');
const stripe = require("stripe")("sk_test_51EgE2aEUu08wLGaUGiUyFwriWfKuh0wu95ROSgQMQx9j6J5sfJPhkqUS6kE28dz5OGWQ6TZclVd1wznAlkeoGP2Y00GsmCoesh");
const moment = require('moment');
const unparsed = require("koa-body/unparsed.js");
/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */
const endpointSecret = 'whsec_25ecd43d2f89e0d14ee119e09cf49634968f3ead33fe6d4dc735ef6a111eb904'
module.exports = {
  async create(ctx){
    let entity,found,amount;
    const {
      cleaner,
      customer,
      bedroomCount,
      bathroomCount,
      instructions,
      pets,
      time,
      date,
      address} = ctx.request.body;
    try {
      const day = moment(date).format('dddd');
      const schedule = await strapi.query('schedule').findOne(
        {cleaner:cleaner,
          available:true,
          startTime_lte:time,
          endTime_gte:time
        })
        
        found = schedule?.days.filter(val=>{
          return val == day; 
        })
        if(found?.length<1){
          return;
        }
      const services = await strapi.services.service.findOne({cleaner:cleaner})

      amount = (bedroomCount * services.bedroomDuration + 
        bathroomCount * services.bathroomDuration + 
        1 * services.kitchenDuration + 
        1 * services.livingroomDuration ) * services.ratePerHour;


      entity = await strapi.services.booking.create({
        cleaner,
        customer,
        date,
        time,
        bedroomCount,
        bathroomCount,
        instructions,
        pets,
        address,
        amount
      })
      return sanitizeEntity(entity, { model: strapi.models.booking });
    } catch (error) {
      console.log(error)
      return error;
    }
  },
  async payStripe(ctx){
    const {id,bookingID} = ctx.request.body;
    const user = ctx.state.user; 
    try {
      const booking = await strapi.services.booking.findOne({id:bookingID});
      const wallet  = await strapi.services.wallet.findOne({cleaner:booking.cleaner.id})

      const paymentIntent = await stripe.paymentIntents.create({
        amount: booking.amount * 100,
        currency: "USD",
        description: `bookingID${bookingID} Booking payment for bookingID${bookingID} with ${user.email} userID:${user.id}`,
        payment_method: id,
        confirm: true,
        application_fee_amount: booking.amount * 20,
				transfer_data: {
					destination:  wallet.connectAccountID,
				},
      })
      const clientSecret = paymentIntent.client_secret;
      const status = paymentIntent.status;
      await strapi.services.payment.create({
        booking:bookingID,
        intentID:paymentIntent.id,
        status
      })

      return { clientSecret,status };
    } catch (err) {
      console.error(err);
      return err;
    }
  },
  async paymentwebhook(ctx){
    const sig = ctx.headers['stripe-signature'];
    const unparsedBody = ctx.request.body[unparsed];
  
    let event = null;
    let endpointSecret;

  
    try {
      if(process.env.NODE_ENV==='production'){
        endpointSecret = process.env.STRIPE_WEBHOOK_PROD
      }else{
        endpointSecret = process.env.STRIPE_WEBHOOK_LOCAL
      }
      event = stripe.webhooks.constructEvent(unparsedBody, sig, endpointSecret);
      
      let intent = null;
      console.log(event['type']);
      let subscription;
      switch (event['type']) {
        case 'invoice.paid':
          intent = event.data.object;
          subscription = await strapi.services.stripe.update(
            {customerID:intent.customer},{subscriptionStatus:'subscribed',subscriptionID:intent.subscription});

          // const cleaner = await strapi.services.cleaner.findOne({id:subscription.cleaner.id},{subscriptionStatus:'subscribed'});
          await strapi.query('user', 'users-permissions').update({ id:subscription.cleaner.user }, { role: process.env.PREMIUM_ID })

          await strapi.plugins['email'].services.email.send({
            to: `${intent.customer_email}`, //todo
            from: process.env.SENDGRID_EMAIL,
            replyTo:  process.env.SENDGRID_EMAIL,
            subject:  'Wand Subscription',
            text: `${intent.customer_email} is subscribed and payment in deducted from your account, if want to unsubcribe you can contact the us`,
          })
          break;
        case 'invoice.payment_failed':
          intent = event.data.object;
          subscription = await strapi.services.stripe.update({customerID:intent.customer},{subscriptionStatus:'unpaid'});

          const cleaner = await strapi.services.cleaner.findOne({id:subscription.cleaner.id});
          await strapi.query('user', 'users-permissions').update({ id:cleaner.user.id }, { role: process.env.AUTHENTICATED_ID })

          await strapi.plugins['email'].services.email.send({
            to: `${cleaner?.user.email}`, 
            from: process.env.SENDGRID_EMAIL,
            replyTo:  process.env.SENDGRID_EMAIL,
            subject:  'Wand Subscription',
            text: `${cleaner?.user?.email} payment for subscription is failed so you are demoted to normal cleaner, if you dont want to continue pls cancel the subscription by contacting us via EMAIL or website`,
          })
          break;
        case 'payment_intent.succeeded':
          intent = event.data.object;
          let idx;
          const payment = await strapi.services.payment.findOne({intentID:intent.id});
          if(!payment){
            const regex = /bookingID[0-9]*/g;
            const found = intent.description.match(regex);
            if(!found){
              return;
            }
            idx = found[0].substring(9);
            await strapi.services.payment.create({
              booking:idx,
              intentID:intent.id,
              status:'succeeded'
            })
          }else{
            idx = payment.booking.id;
          }
          await strapi.services.booking.update({id:idx},{paid:true,paidBy:'stripe'});
          break;
      }
    
      return {msg:'success'};


    } catch (err) {
      // invalid signature
      console.log(err)
      return err;
    }
  }
};
