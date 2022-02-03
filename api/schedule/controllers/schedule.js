const { parseMultipartData, sanitizeEntity } = require('strapi-utils');
const  axios = require('axios');

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  async create(ctx) {
    const {available,startTime,endTime,days} = ctx.request.body;

    let entity;
    if (ctx.is('multipart')) {
      const { data, files } = parseMultipartData(ctx);
      entity = await strapi.services.restaurant.create(data, { files });
    } else {
      try {
        let user = await axios.get(`${process.env.PUBLIC_URL}users`,
        {headers:{"Authorization":ctx.headers.authorization}});
        if(user){
          entity = await strapi.services.schedule.create({
            available,
            startTime,
            endTime,
            days,
            cleaner:user.data[0].cleaner.id
          });
          return sanitizeEntity(entity, { model: strapi.models.schedule });
        }
      } catch (error) {
        return error;
      }
    }
  }
}
