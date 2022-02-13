'use strict';
const { parseMultipartData, sanitizeEntity } = require('strapi-utils');
const  axios = require('axios');

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

        let business = await strapi.services.business.update({
          admin:ctx.state.user.id},
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
      
    }
  }
};
