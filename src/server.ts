import * as bunyan from 'bunyan';
import * as nconf from 'nconf';
import * as path from 'path';
import * as twit from 'twit';

const config = {
  projectId: 'tweet-spy',
  keyFilename: 'keyfile.json'
};

const keywords = require('../../keywords') as Keywords;

require('@google-cloud/debug-agent')
    .start(Object.assign({allowExpressions: true}, config));
const loggingBunyan = require('@google-cloud/logging-bunyan')(config);
const bq = require('@google-cloud/bigquery')(config);

const logger = bunyan.createLogger({
  name: 'twitter-ingest',
  streams:
      [{stream: process.stdout, level: 'debug'}, loggingBunyan.stream('info')],
  serializers: bunyan.stdSerializers
});

const dataset = bq.dataset('twitter');
const table = dataset.table('tweets');
const secrets = path.resolve('./secrets.json');
console.log(secrets);
nconf.argv().env().file({file: secrets});

const twitter = new twit({
  consumer_key: nconf.get('twitter_consumer_key'),
  consumer_secret: nconf.get('twitter_consumer_secret'),
  access_token: nconf.get('twitter_access_token'),
  access_token_secret: nconf.get('twitter_token_secret'),
});

/**
 * When a new tweet matches the filter, check to see if it also
 * mentions any programming languages we care about.
 */
const tags =
    keywords.tags.map(tag => tag.hints.join(', ')).join(', ');
logger.info(tags);
const stream = twitter.stream('statuses/filter', {track: tags});
stream.on('tweet', tweet => {
  logger.info(tweet.text);
  let text = tweet.text;
  if (tweet.is_quote_status) {
    logger.debug(`QUOTED: ${tweet.quoted_status.text}`);
    text = `${text} | ${tweet.quoted_status.text}`;
  }
  //console.log(tweet);
  // const t = {
  //   created_at: Date.parse(tweet.created_at) / 1000,
  //   text,
  //   id: tweet.id,
  //   tags: null
  // } as Tweet;

  // // assign tags to the tweet
  // t.tags = langKeywords.filter(item =>
  //   item.tags.some(tag =>
  //     text.toLowerCase().includes(tag)))
  // .map(item => item.name);

  // data.clouds = await getTags(tweet.text, keywords.clouds);

  // logger.info(data);
  // writeToBigQuery(data)
});

/**
 * Write the data set out to a pre-defined bigquery table
 * @param results The list of npm modules and their date/counts
 */
async function writeToBigQuery(data: {}) {
  try {
    await table.insert(data);
  } catch (err) {
    logger.error(err);
    if (err.name === 'PartialFailureError') {
      for (const e of err.errors) {
        logger.error(e);
        for (const e2 of e.errors) {
          logger.error(e2);
        }
      }
    }
  }
}

interface Keywords {
  tags: Tags[];
}

interface Tags {
  name: string;
  hints: string[];
}

interface Tweet {
  created_at: Date;
  text: string;
  url: string;
  id: string;
  language: string;
  tags: string[];
}