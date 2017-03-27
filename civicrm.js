

const HTTP = require('http');
const request = require('request');

const debug_enabled = false;

function debug() {
  if (debug_enabled) {
    console.log(arguments);
  }
}

function api(entity, action, params) {
  return new Promise(function(ok, fail) {
    let handle_response, opts;
    params.sequential = 1;
    opts = {
      qs: {
        key: process.env['CIVICRM_SITE_KEY'],
        api_key: process.env['CIVICRM_API_KEY'],
        entity: entity,
        action: action,
        json: JSON.stringify(params)
      }
    };
    debug("[C!] " + entity + "." + action + "(" + opts.qs.json + ")");
    handle_response = function(err, status, body) {
      let data;
      if (err) {
        return fail(err);
      } else {
        data = JSON.parse(body);
        if (data.is_error > 0) {
          return fail("Civi API call error body:" + body);
        } else {
          return ok(data.values);
        }
      }
    };
    if (action === 'get') {
      let url = process.env['CIVICRM_ENDPOINT'];
      console.log(`url: ${url}`);
      return request.get(url, opts, handle_response);
    } else {
      return request.post(url, opts, handle_response);
    }
  });
};



module.exports = {
  api: api,
};
