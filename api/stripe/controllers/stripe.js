const { parseMultipartData, sanitizeEntity } = require('strapi-utils');
const stripe = require("stripe")("sk_test_51EgE2aEUu08wLGaUGiUyFwriWfKuh0wu95ROSgQMQx9j6J5sfJPhkqUS6kE28dz5OGWQ6TZclVd1wznAlkeoGP2Y00GsmCoesh");
const moment = require('moment');
/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  async trialsubscribe(ctx){
    const  {id} = ctx.state.user;

    const endDate = moment().add(30, 'day');
    const endDate1 = endDate.format('YYYY-MM-DD');

    try{
      const cleaner = await strapi.services.cleaner.findOne({user:id});
      const taken = await strapi.services.stripe.findOne({cleaner:id});
      let entity;
      if(!taken){
        entity = await strapi.services.stripe.create({
          subscriptionStatus:'trial',
          trialEndDate:endDate1,
          cleaner:cleaner.id,
          trialTaken:true
        });

        await strapi.query('user', 'users-permissions').update({ id }, { role: process.env.PREMIUM_ID })

        return sanitizeEntity(entity, { model: strapi.models.stripe });
      }else{
        return {msg:"already taken"}
      }
    } catch (error) {
      return error;
    }
  },
  async subscribe(ctx){
    const  {email,id} = ctx.state.user;
    let SubscribedCustomer,entity,str;
    const cleaner = await strapi.services.cleaner.findOne({user:id});

    const {payment_method} = ctx.request.body;

    try {
      SubscribedCustomer = await strapi.services.stripe.findOne({
        cleaner:cleaner.id
      })

      if(SubscribedCustomer?.subscriptionStatus==='subscribed'){
          return {msg:"already subscribed"};
      }
      entity = await stripe.customers.create({
        payment_method: payment_method,
        email: email,
        invoice_settings: {
          default_payment_method: payment_method,
        },
      });

      if(!SubscribedCustomer){

        str = await strapi.services.stripe.create({
          customerID:entity.id,
          cleaner:cleaner.id,
        })
      }else{
        str = await strapi.services.stripe.update(
          {cleaner:cleaner.id},
          {customerID:entity.id})
      }
      console.log(str);


      const subscription = await stripe.subscriptions.create({
        customer: entity.id,
        items: [{ plan: process.env.PREMIUM_PLAN }],
        expand: ['latest_invoice.payment_intent'],
      });



      const status = subscription['latest_invoice']['payment_intent']['status'] 
      const client_secret = subscription['latest_invoice']['payment_intent']['client_secret'];


      return {'client_secret': client_secret, 'status': status};
    } catch (error) {
      return error
    }
  },
  async cancelsubscription(ctx){
    const {id} = ctx.state.user;
    try {
      const cleaner = await strapi.services.cleaner.findOne({user:id});
      const subscription = await strapi.services.stripe.findOne({cleaner:cleaner.id,subscriptionStatus:'subscribed'});
      if(subscription){
        const deleted = await stripe.subscriptions.del(
          subscription.subscriptionID //todo
        );
  
  
        const cleaner = await strapi.services.cleaner.findOne({id:subscription.cleaner.id});
        await strapi.query('user', 'users-permissions').update({ id:cleaner.user.id }, { role: process.env.AUTHENTICATED_ID })
        await strapi.services.stripe.delete({cleaner:cleaner.id});
  
        await strapi.plugins['email'].services.email.send({
          to: `${cleaner?.user.email}`,
          from: process.env.SENDGRID_EMAIL,
          replyTo:  process.env.SENDGRID_EMAIL,
          subject:  'Wand Subscription',
          text: `${cleaner?.user?.email} has cancelled the subscription`,
        })
        return deleted;
      }
      return {msg:"no record found, may be user does not have subscription"};
    } catch (error) {
      return error;
    }
  },
};
