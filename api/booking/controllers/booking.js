const { parseMultipartData, sanitizeEntity } = require('strapi-utils');
const stripe = require("stripe")("sk_test_5");
const moment = require('moment');
const unparsed = require("koa-body/unparsed.js");
/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

const formatError = error => [
  { messages: [{ id: error.id, message: error.message, field: error.field }] },
];
module.exports = {
  async create(ctx){
    let entity,found,amount;
    const {
      cleaner,
      customer,
      paidBy,
      pets,
      time,
      date,
      type,
      instructions,
      ratePerHour,
      duration,
      hour,
      address} = ctx.request.body;
    try {
      const day = moment(date).format('dddd');
      const schedule = await strapi.query('schedule').findOne(
        {cleaner:cleaner,
          available:true,
        })
        if(!schedule){
          return ctx.badRequest('cleaner not available...');
        }
        
        found = schedule?.days.filter(val=>{
          return val == day; 
        })

      amount = duration * hour * +ratePerHour;

      entity = await strapi.services.booking.create({
        cleaner,
        customer,
        date,
        time,
        type,
        pets,
        address,
        duration,
        hour,
        amount,
        instructions,
        paidBy
      })
      return sanitizeEntity(entity, { model: strapi.models.booking });
    } catch (error) {
      console.log(error)
      return ctx.badRequest(error);
    }
  },
  async finder(ctx){
    const cleanerId = ctx.state.user.cleaner;
    const {allStatus,type,date}=ctx.request.body;
    var obj={};
    obj.cleaner=cleanerId
    try {
      if(allStatus.length>1){
        obj.status=allStatus
      }
      if(type){
        obj.type=type
      }
      if(date){
        var d = moment(date).format("YYYY-MM-DD");
        obj.date=d
      }
      var entity= await strapi.services.booking.find(obj)
      return sanitizeEntity(entity, { model: strapi.models.booking });;
    } catch (error) {
      return ctx.badRequest(error)
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
    } catch (error) {
      console.error(error);
      return ctx.badRequest(error);
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
      return ctx.badRequest(err)
    }
  },
  async revenueYearly(ctx) {
    const cleanerId =  ctx.state.user.cleaner;
    const {startDate,endDate}=ctx.request.body;
    var startMonth,starter,breaker;
    try {
      let entities;
      let length=[];
      let months=[];
      let revenues=[];
      if(!startDate){
        startMonth=moment().subtract(11,'months').format("YYYY-MM-01");
        starter=startMonth;
      }else{
        starter=endDate;
        breaker=moment(startDate).add(1,'months').format("YYYY-MM-01");
      }
  
      for(var i=0;i<12;i++){
        const startMonthLoop=moment(starter).add(i,'months').format("YYYY-MM-01");
        const endMonth=moment(startMonthLoop).endOf('month').format("YYYY-MM-DD");
        if(startDate && startMonthLoop===breaker){
          break;
        }
        // const month=moment(startMonthLoop).format('MMMM');
          entities = await strapi.query('booking').find({ created_at_gte: startMonthLoop,created_at_lte: endMonth,cleaner:cleanerId})
        let revenue=0;
        entities.map((val,i)=>{
          revenue=revenue+ val.amount;
        })
        revenues.push(revenue);
        months.push(endMonth);
        length.push(entities.length)
      }
      return {length,months,revenues};
      
    } catch (error) {
      return ctx.badRequest(error)
    }
  },

  async getReview(ctx){
    try {
      const cleanerId = ctx.params.cleanerId
      const bookings = await strapi.services.booking.find({cleaner:cleanerId,status:'COMPLETED'})
      var total=0;
      for(let booking of bookings){
        total += booking.rating;
      }
      total = total / bookings.length;
      return {review:total,total:bookings.length};
    } catch (error) {
      return ctx.badRequest(error)
    }
  }
};
