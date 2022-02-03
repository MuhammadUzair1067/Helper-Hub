const { parseMultipartData, sanitizeEntity } = require('strapi-utils');
const  axios = require('axios');

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

module.exports = {
  async create(ctx){
    try {
      const {email,password,phoneNumber} = ctx.request.body;

      let user = await axios.post(`${process.env.PUBLIC_URL}auth/local/register`,{
        email,
        username:email,
        password
      });

      const a = await strapi.query('user', 'users-permissions').update({ id: user.data.user.id }, { role: process.env.CUSTOMER_ID })

      let entity = await strapi.services.customer.create({
        phoneNumber,
        user:user.data.user.id
      })

      return {  ...entity, user: {...user.data, role: a.role} }
    } catch (error) {
      return error;
    }
  }
};
