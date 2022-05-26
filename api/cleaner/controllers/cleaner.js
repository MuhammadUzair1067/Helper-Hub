'use strict';
const { parseMultipartData, sanitizeEntity } = require('strapi-utils');
const  axios = require('axios');

const formatError = error => [
  { messages: [{ id: error.id, message: error.message, field: error.field }] },
];

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  async create(ctx){
    let url;
    try {
      const {email,password,firstName,lastName,age,phoneNumber} = ctx.request.body;
      if(process.env.NODE_ENV==='production'){
        url=process.env.PUBLIC_URL;
      }else{
        url=process.env.PUBLIC_URL_LOCAL;
      }

      let user;
      try {
        user = await axios.post(`${url}auth/local/register`,{
          email,
          username:email,
          password
        })
      }catch (error) {
          console.log(error)
          return ctx.badRequest(
            formatError({message:'email could be already taken'})
          );
        };

      if(user.data){
        let cleaner = await strapi.services.cleaner.create({
          firstName,
          lastName,
          phoneNumber,
          user:user.data.user.id
        });

        await strapi.services.service.create({
          ratePerHour:30,
          cleaner: cleaner.id
        })

        await strapi.services.schedule.create({
          available:true,
          startTime:"00:30:00.000",
          endTime:"02:30:00.000",
          days:["Monday","Tuesday","Friday"],
          cleaner:cleaner.id
        });

        let business = await strapi.services.business.create({
          admin:cleaner.id,
          age
        });
        return {cleaner,...user.data,business};
        }
    } catch (error) {
      console.log(error)
      return ctx.badRequest(error);
    }
  },

  async fetchcleaner(ctx){
    try {
      const customerId= ctx.state.user.customer;
      const business = await strapi.services.business.findOne({customers:customerId});
      const cleaner = await strapi.services.cleaner.findOne(
        {id:business.admin.id});

      return {
        schedule:cleaner.schedule,
        service:cleaner.service,
        wallet:cleaner.wallet?.onboarding,
        business:cleaner.business,
        firstName:cleaner.firstName,
        lastName:cleaner.lastName}
    } catch (error) {
      return ctx.badRequest(
        error
      );
    }
  },

  async stats(ctx){
    try {
      const id = ctx.state.user.cleaner;
      var unCompletedCount=0,totalRevenue=0,forcastRevenue=0;
      const bookings = await strapi.services.booking.find({cleaner:id});
      for(var a=0; a<bookings.length; a++){
        if(bookings[a].status!=='COMPLETED'){
          unCompletedCount++;
          forcastRevenue+=bookings[a].amount;
        }
        totalRevenue+=bookings[a].amount;
      }
      return {
        totalBookings:bookings.length,
        totalRevenue,
        forcastRevenue,
        unCompletedCount}
    } catch (error) {
      ctx.badRequest(error)
    }
  },
  // async update(ctx){
  //   try {
  //     const {email,password,firstName,lastName,zipcode,phoneNumber,userId,cleanerId,businessId} = ctx.request.body;

  //     let user = await axios.post(`${process.env.PUBLIC_URL}auth/local/register`,{
  //       email,
  //       username:email,
  //       password
  //     });
  //     if(user.data){
  //       let cleaner = await strapi.services.cleaner.create({
  //         firstName,
  //         lastName,
  //         phoneNumber,
  //         user:user.data.user.id
  //       });

  //       let business = await strapi.services.business.create({
  //         admin:cleaner.id,
  //         zipcode
  //       });
  
  //       return {...cleaner,user,business};
  //       }
  //   } catch (error) {
  //     return error;
  //   }
  // },
  // async find(ctx){
  //   const {email} = ctx.state.user;
  //   try {
  //     let user = await axios.get(`${process.env.PUBLIC_URL}users`,
  //     {email},
  //     {headers: ctx.headers});

  //     return user.data;
  //   } catch (error) {
  //     return error;
  //   }
  // },
  async createEmployee(ctx){
    try {
      const {email,password,firstName,lastName,phoneNumber} = ctx.request.body;

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

        let adminCleaner = await strapi.services.cleaner.findOne({user:ctx.state.user.id});

        await strapi.services.business.update({
          admin:adminCleaner.id},
          {cleaners:cleaner.id});

        await strapi.query('user', 'users-permissions').update({ id:user.data.user.id }, { role: process.env.EMPLOYEE_ID })

        await strapi.plugins['email'].services.email.send({
          to: `${cleaner?.user.email}`, 
          from: process.env.SENDGRID_EMAIL,
          replyTo:  process.env.SENDGRID_EMAIL,
          subject:  'Wand Profile Creation',
          text: `${ctx.state.user?.email} created your profile. Login to ${process.env.DOMAIN_URL} .your Username:${email} Password:${password}`,
        })
        
        return sanitizeEntity(cleaner, { model: strapi.models.cleaner });;
        }
    } catch (error) {
      console.log(error)
      return ctx.badRequest(error);
    }
  }
};
