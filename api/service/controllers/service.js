const { parseMultipartData, sanitizeEntity } = require('strapi-utils');
const  axios = require('axios');

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  async create(ctx){
    let entity;
    const {bathroomDuration, kitchenDuration,bedroomDuration,livingroomDuration,ratePerHour} = ctx.request.body;
    try {
      let user = await axios.get(`${process.env.PUBLIC_URL}users`,
      {headers:{"Authorization":ctx.headers.authorization}});

      entity = await strapi.services.service.create({
        bathroomDuration, 
        kitchenDuration,
        bedroomDuration,
        livingroomDuration,
        ratePerHour,
        cleaner:user.data[0].cleaner.id
      })
      return sanitizeEntity(entity, { model: strapi.models.service });
    } catch (error) {
      return error;
    }
  }
};
