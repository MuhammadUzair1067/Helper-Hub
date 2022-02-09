'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  async create(ctx){
    try {
      const {email} = ctx.request.body;

      let entity = await strapi.services.unsubscribers.findOne({email});
      if(!entity){
        entity = await strapi.services.unsubscribers.create({email});
      }
      return;
    } catch (error) {
      return error;
    }
  }
};
