

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

function getWholeTicket(ticket, include_requester) {
  return new Promise((ok, error) => {
    return freshdesk.getTicket(ticket.id, (failure, wholeticket, extra) => {
      if (failure == null) {
        if (include_requester) {
          freshdesk.getContact(wholeticket.requester_id, (failure2, contact, extra) => {
            console.log(`FD.getContact(${wholeticket.requester_id}=>error=${failure2})`);
            if (failure2) {
              return error(failure2);
            }
            wholeticket.requester = contact;
            return ok(wholeticket);
          });
        } else {
          return ok(wholeticket);
        }
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
