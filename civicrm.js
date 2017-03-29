
const HTTP = require('http');
const request = require('request');

const debug_enabled = false;

function debug() {
  if (debug_enabled) {
    console.log(...arguments);
  }
}

module.exports = {
  site_key: null,
  api_key: null,
  endpoint: null,
};


function api(entity, action, params) {
  if (module.exports.api_key == null || module.exports.site_key == null) {
    throw new Error("Please set CiviCRM api keys");
  }
  if (module.exports.endpoint == null) {
    throw new Error("Please set CiviCRM endpoint");
  }
  return new Promise(function(ok, fail) {
    let handle_response, opts;
    params.sequential = 1;
    opts = {
      qs: {
        key: module.exports.site_key,
        api_key: module.exports.api_key,
        entity: entity,
        action: action,
        json: JSON.stringify(params)
      }
    };
    debug("[C>] " + entity + "." + action + "(" + opts.qs.json + ")");
    handle_response = function(err, status, body) {
      let data;
      if (err) {
        return fail(err);
      } else {
        data = JSON.parse(body);
        debug("[C<] " + body);
        if (data.is_error > 0) {
          return fail("Civi API call error body:" + body);
        } else {
          return ok(data.values);
        }
      }
    };
    if (action === 'get') {
      let url = module.exports.endpoint;
      console.log(`url: ${url}`);
      return request.get(url, opts, handle_response);
    } else {
      return request.post(url, opts, handle_response);
    }
  });
};


module.exports.api = api;
