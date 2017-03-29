require("dotenv").config();

var cron = require('node-cron');

var fd = require('./fd.js');
var civicrm = require('./civicrm.js');

civicrm.site_key = process.env['CIVICRM_SITE_KEY'];
civicrm.api_key =  process.env['CIVICRM_API_KEY'];
civicrm.endpoint = process.env['CIVICRM_ENDPOINT'];

class ProcessTickets {
  constructor(start_date, handlers) {
    this.start_date = start_date;
    this.handlers = handlers;
  }

  processLastTickets() {
    return fd.fetchLastTickets(this.start_date).then((tickets) => {
      this.tickets = tickets;
      return this.next();
    });
  }

  next() {
    const t = this.tickets.pop(0);
    if (t == null) {
      return null;
    }

    let proc = fd.getWholeTicket(t, true)
          .then((wt) => {
            return Promise.all(
              this.handlers.map((h) => {
                return h(wt);
              }))
              .then((results) => {
                results.forEach((x)=>console.log(`ticket ${wt.id}> ${JSON.stringify(x)}`));
                const newTags = results.reduce((acc, r) => {
                  return acc.concat(r.tags);
                }, []).filter((x) => x!=undefined);
                return fd.tagTicket(wt, newTags);
              });
          })
          .then((whatever)=>this.next())
          .catch((e) => {
            console.log(`problem processing: ${e}`);
            console.log(e.stack);
            this.next();
          });

    return proc;
  }

}

class OptoutTickets {
  process(ticket) {
    console.log(`ticket type = ${ticket.type}`);
    if (ticket.type == "Wypisanie" &&
        ticket.tags.indexOf("wypisano") == -1) {

      return civicrm.api('Contact', 'get', {
        email: ticket.requester.email,
        "api.Contact.setvalue": {
          field: "is_opt_out",
          value: 1
        }})
        .then((civiok) =>{
          console.log(`Opt Out from Civi: ${ticket.requester.email}`);
          return {tags: ["wypisano"]};
        } );
    } else {
      return {};
    }

  }
}

class AnnotateTickets  {
  process(ticket) {
    return this.getTicketTags(ticket)
      .then((t) => { return {tags: t}; });
  }

  getTicketTags(ticket) {
    // figure out if it's a reply
    const sre = /^(odp|sv|re): ?(.*)/i;
    const m = sre.exec(ticket.subject);
    if (m) {
      const s = m[2];
      console.log(`Got subject ${s}`);

      // fetch mailing
      let fm = civicrm.api('Mailing', 'get', {
        subject: s,
        "api.Campaign.get": {"return":["id","title"]}
      });

      return fm.then((results) => {
        const md = results[0];
        console.log("mailing :" + md);
        if (md == null) {
          return [];
        }
        let tags = [];

        // tag by author - disabled on request
        // const author = /^(\S+) +(\S+)/iu.exec(md.from_name);
        // if (author) {
        //   tags.push(`od ${author[1]} ${author[2]}`);
        // }

        // tag by campaign
        const camps = md['api.Campaign.get'];
        if (camps.count != 1) {
          console.log(`campaign was not set for mailing ${md.id}`);
        } else {
          tags.push(camps.values[0].title);
          return tags;
        }
        return tags;
      });
    } else {
      return new Promise((o,e)=> o([]));
    }
  }
}

var moment = new Date("2017.03.26");


if (process.argv[2] == '-a')  {

  cron.schedule("*/5 * * * *", () =>
                   {
                     const start = moment;
                     moment = new Date();
                     console.log(`Annotate tickets changed since ${start}`);
                     let annotator = new AnnotateTickets();
                     let optouter = new OptoutTickets();
                     let processor = new ProcessTickets(start, [
                       (t)=>annotator.process(t),
                       (t)=>optouter.process(t)
                     ]);
                     processor.processLastTickets();
                   },
                true);

}

module.exports = {
  test: function() {
    let optouter = new OptoutTickets();
    fd.getWholeTicket({id: 8467 }, true)
      .then((ticket) => {
        return optouter.process(ticket);
      });

    // let annotator = new AnnotateTickets();
    // let processor = new ProcessTickets(moment, [
    //   (t)=>annotator.process(t)
    // ]);
    // processor.processLastTickets();
  },
  test2: function() {
    let annotator = new AnnotateTickets();
    let optouter = new OptoutTickets();
    let processor = new ProcessTickets(new Date('2017.03.27'), [
      (t)=>annotator.process(t),
      (t)=>optouter.process(t)
    ]);
    processor.processLastTickets();
  }
}
