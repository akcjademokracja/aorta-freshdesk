

const fd = require("node-freshdesk-api");
const repl = require('repl');
const civicrm = require('./civicrm.js');

const freshdesk = new fd(process.env['FRESHDESK_URL'],
                       process.env['FRESHDESK_PASSWORD']);

function fetchLastTickets(since) {
  const p = new Promise((ok, error) => {
    freshdesk.listAllTickets({updated_since: new Date(since)}, (e, d) => {
      if (e == null) {
        ok(d);
      } else {
        error(e);
      }
    });
  });
  return p;
};

function getWholeTicket(ticket) {
  return new Promise((ok, error) => {
    return freshdesk.getTicket(ticket.id, (failure, data, extra) => {
      if (failure == null) {
        return ok(data);
      } else {
        return error(failure);
      }
    });
  });
}

function tagTicket(ticket, tags) {
  return new Promise((ok, error) => {
    console.log(`Tag ticket ${ticket.id} <== [${tags.join(', ')}]`);
    let new_tags = [...new Set(ticket.tags.concat(tags))];
    console.log(`${ticket.tags} + ${tags} = ${new_tags}`);

    return freshdesk.updateTicket(ticket.id, {
      tags: new_tags
    }, (err, data, extra) => {
      if (err) {
        return error(err, data);
      } else {
        if (extra) {
          console.log("tagTicket: got extra data "+extra);
        }
        return ok(data);
      }
    });
  });
};

module.exports = {
  freshdesk: freshdesk,
  tagTicket: tagTicket,
  fetchLastTickets: fetchLastTickets,
  getWholeTicket: getWholeTicket
}
