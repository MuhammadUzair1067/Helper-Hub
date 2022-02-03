'use strict';
const { parseMultipartData, sanitizeEntity } = require('strapi-utils');
const  axios = require('axios');
const stripe = require("stripe")("sk_test_TJ0xZiLwb8VtmVn9beNRsDFh00rLP48kV5");

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  async create(ctx){
    try {
      const {email,password,firstName,lastName,zipcode,phoneNumber} = ctx.request.body;

      let user = await axios.post(`${process.env.PUBLIC_URL}auth/local/register`,{
        email,
        username:email,
        password
      });
      if(user.data){
        let cleaner = await strapi.services.cleaner.create({
          firstName,
          lastName,
          phoneNumber,
          user:user.data.user.id
        });

        let business = await strapi.services.business.create({
          admin:cleaner.id,
          zipcode
        });
  
        return {...cleaner,user:user.data,business};
        }
    } catch (error) {
      return error;
    }
  },
  async update(ctx){
    try {
      const {email,password,firstName,lastName,zipcode,phoneNumber,userId,cleanerId,businessId} = ctx.request.body;

      let user = await axios.post(`${process.env.PUBLIC_URL}auth/local/register`,{
        email,
        username:email,
        password
      });
      if(user.data){
        let cleaner = await strapi.services.cleaner.create({
          firstName,
          lastName,
          phoneNumber,
          user:user.data.user.id
        });

        let business = await strapi.services.business.create({
          admin:cleaner.id,
          zipcode
        });
  
        return {...cleaner,user,business};
        }
    } catch (error) {
      return error;
    }
  },
  async find(ctx){
    const {email} = ctx.state.user;
    try {
      let user = await axios.get(`${process.env.PUBLIC_URL}users`,
      {email},
      {headers: ctx.headers});

      return user.data;
    } catch (error) {
      return error;
    }
  },
  async subscribe(ctx){
    console.log('he')
    const  {email} = ctx.state.user;
    const { payment_method} = ctx.request.body;
    try {
      const customer = await stripe.customers.create({
        payment_method: payment_method,
        email: email,
        invoice_settings: {
          default_payment_method: payment_method,
        },
      });

      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ plan: 'price_1KOejOEUu08wLGaUJWpPchjz' }],
        expand: ['latest_invoice.payment_intent'],
      });

      const status = subscription['latest_invoice']['payment_intent']['status'] 
      const client_secret = subscription['latest_invoice']['payment_intent']['client_secret']

      return {'client_secret': client_secret, 'status': status};
    } catch (error) {
      return error
    }
  },
  async trialsubscribe(ctx){
    console.log('he')
    const  {email} = ctx.state.user;
    const {payment_method} = ctx.request.body;
    try {
      const customer = await stripe.customers.create({
        payment_method: payment_method,
        email: email,
        invoice_settings: {
          default_payment_method: payment_method,
        },
      });

      const subscription = await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ plan: 'price_1KOejOEUu08wLGaUJWpPchjz' }],
        expand: ['latest_invoice.payment_intent'],
      });

      const status = subscription['latest_invoice']['payment_intent']['status'] 
      const client_secret = subscription['latest_invoice']['payment_intent']['client_secret']

      return {'client_secret': client_secret, 'status': status};
    } catch (error) {
      return error
    }
  },
  async cancelsubscription(ctx){
    try {
      const deleted = await stripe.subscriptions.del(
        'sub_1KOge74XsdaddaBSVfN73R85'
      );
    } catch (error) {
      
    }
  }
};
