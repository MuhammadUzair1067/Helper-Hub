const { parseMultipartData, sanitizeEntity } = require('strapi-utils');


/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  async invite(ctx){
    try {
      const {email} = ctx.state.user;
      const {sendTo,body,URL,businessID} = ctx.request.body;
      // const cleaner = await strapi.services.cleaner.findOne({id:cleanerID});

      // let unsub = await strapi.services.unsubscribers.findOne({email:sendTo});
      // if(unsub){
      //   return {msg:"unsubscribed already"}
      // }
      
      await strapi.plugins['email'].services.email.send({
        to: `${sendTo}`,
        from: process.env.SENDGRID_EMAIL,
        replyTo:  process.env.SENDGRID_EMAIL,
        subject:  'Wand Invite',
        text: `${email} has invited you. ${body} ${URL}`,
      })

      entity = await strapi.services.notification.create({
        body,
        business:businessID,
        createdBy:'invite',
        sendEmail:true,
        sendTo
      })

      return sanitizeEntity(entity, { model: strapi.models.notification });
    } catch (error) {
      return error;
    }
  },
  async create(ctx){
    const {body,businessID,customerID,sendEmail,sendTo,createdBy} =ctx.request.body;
    let entity;
    try {
      entity = await strapi.services.notification.create({
        body,
        business:businessID,
        customer:customerID,
        createdBy,
        sendEmail,
        sendTo
      })
      if(sendEmail){
        // unsub = await strapi.services.unsubscribers.findOne({email:sendTo});
        // if(unsub){
        //   return {msg:"unsubscribed already"}
        // }
        const em = await strapi.plugins['email'].services.email.send({
          to: `${sendTo}`, //todo
          from: process.env.SENDGRID_EMAIL,
          replyTo:  process.env.SENDGRID_EMAIL,
          subject:  'Wand Notification',
          text: `${body}`,
        })
      }
      return sanitizeEntity(entity, { model: strapi.models.notification });
    } catch (error) {
      console.log(error)
      return error;
    }
  }
};
