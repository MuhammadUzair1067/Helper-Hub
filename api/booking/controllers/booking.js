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
      const {amount,cleaner} = await strapi.services.booking.findOne({id:bookingID});
      const wallet  = await strapi.services.wallet.findOne({cleaner:cleaner.id})

      const paymentIntent = await stripe.paymentIntents.create({
        amount: amount * 100,
        currency: "USD",
        description: `bookingID${bookingID} Booking payment for bookingID${bookingID} with ${user.email} userID:${user.id}`,
        payment_method: id,
        confirm: true,
        application_fee_amount: amount * 20,
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
    const body = ctx.request.body;
    const unparsedBody = ctx.request.body[unparsed];
  
    let event = null;
  
    try {
      event = stripe.webhooks.constructEvent(unparsedBody, sig, endpointSecret);

      let intent = null;
      switch (event['type']) {
        case 'payment_intent.succeeded':
          intent = event.data.object;
          // console.log("Succeeded:", intent.id);
          let idx;
          const payment = await strapi.services.payment.findOne({intentID:intent.id});
          if(!payment){
            const regex = /bookingID[0-9]*/g;
            const found = intent.description.match(regex);
            idx = found[0].substring(9);
            await strapi.services.payment.create({
              booking:idx,
              intentID:intent.id,
              status:'succeeded'
            })
          }else{
            idx = payment.booking;
          }
          await strapi.services.booking.update({id:idx},{paid:true,paidBy:'stripe'});
          break;
        case 'payment_intent.payment_failed':
          intent = event.data.object;
          const message = intent.last_payment_error && intent.last_payment_error.message;
          console.log('Failed:', intent.id, message);
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
