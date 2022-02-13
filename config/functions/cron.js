'use strict';
const moment = require('moment');

/**
 * Cron config that gives you an opportunity
 * to run scheduled jobs.
 *
 * The cron format consists of:
 * [SECOND (optional)] [MINUTE] [HOUR] [DAY OF MONTH] [MONTH OF YEAR] [DAY OF WEEK]
 *
 * See more details here: https://strapi.io/documentation/developer-docs/latest/setup-deployment-guides/configurations.html#cron-tasks
 */

module.exports = {
  /**
   * Simple example.
   * Every monday at 1am.
   */
  '0 0 * * * *': async () => {
    const temp = moment().format('YYYY-MM-DD');
    console.log(temp)
    try {
      const expiredTrials = await strapi.services.stripe.find(
        {
          subscriptionStatus:'trial',
          trialEndDate_lte:temp,
          trialTaken:true,
        });
        for(var a=0;a < expiredTrials.length ; a++){
          const cleaner = await strapi.services.cleaner.findOne({id:expiredTrials[a].cleaner.id});
          await strapi.query('user', 'users-permissions').update({ id:cleaner.user.id }, { role: process.env.AUTHENTICATED_ID })
          await strapi.services.stripe.update(
            {id:expiredTrials[a].id},{subscriptionStatus:'trialtaken'})
        }

      return expiredTrials;
    } catch (error) {
      return error;
    }
  }
};
