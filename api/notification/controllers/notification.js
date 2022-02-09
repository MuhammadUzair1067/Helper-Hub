'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  async invite(ctx){
    try {
      
      const {cleanerID,customerEmail,body,URL} = ctx.request.body;
      const cleaner = await strapi.services.cleaner.findOne({id:cleanerID});

      let unsub = await strapi.services.unsubscribers.findOne({email});
      if(unsub){
        return {msg:"unsubscribed already"}
      }
      
      const emailRes= await strapi.plugins['email'].services.email.send({
        to: `${customerEmail}`,
        from: process.env.SENDGRID_EMAIL,
        replyTo:  process.env.SENDGRID_EMAIL,
        subject:  'valante',
        text: `${cleaner?.user?.email} ${body} ${URL} if you dont want to receive email from here pls click on unsubscribe`,
      })
      return {msg:`invite sent to ${customerEmail}`};
    } catch (error) {
      return error;
    }
  }
};
