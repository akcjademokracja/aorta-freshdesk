require("dotenv").config();

var cron = require('node-cron');

var fd = require('./fd.js');
var civicrm = require('./civicrm.js');


class AnnotateTickets {
  constructor(start_date) {
    if (typeof start_date == 'string') {
      this.start_date = new Date(start_date);
    } else {
      this.start_date = start_date;
    }
  }

  annotateLastTickets() {
    fd.fetchLastTickets(this.start_date).then((tickets) => {
      this.tickets = tickets;
      return this.annotateOneTicket();
    });
  }

  annotateOneTicket() {
    const t = this.tickets.pop(0);
    if (t == null) {
      return;
    }

    console.log(`will annotate ticket #${t.id}`);

    fd.getWholeTicket(t)
      .then((t) => {
        this.getTicketTags(t)
          .then((tags) => {
            if (tags.length == 0) {
              // should be easier to use exception here?
              console.log(`no tags found for ticket ${t.id}`);
              return this.annotateOneTicket();
            }

            return fd.tagTicket(t, tags)
              .then((whatever) => {
                console.log(`success tagging ticket ${t.id}`);
                return this.annotateOneTicket();
              });

          });
      })
      .catch((error) => {
        console.log(`Failed to annotate  ${error}, ignore this ticket`);
        console.log(new Error().stack);
        return this.annotateOneTicket();
      });
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
        if (md == null) {
          return [];
        }
        let tags = [];

        // tag by author
        const author = /^(\S+) +(\S+)/iu.exec(md.from_name);
        if (author) {
          tags.push(`od ${author[1]} ${author[2]}`);
        }

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

var moment = new Date("2017.03.24");

if (process.argv[2] == '-a')  {

  cron.schedule("*/5 * * * *", () =>
                   {
                     const start = moment;
                     moment = new Date();
                     console.log(`Annotate tickets changed since ${start}`);
                     let annotator = new AnnotateTickets(start);
                     annotator.annotateLastTickets();
                   },
                true);

} else {
  let annotator = new AnnotateTickets(moment);
  annotator.annotateLastTickets();
}
