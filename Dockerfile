FROM node

ADD . /app
RUN cd /app && npm install

WORKDIR /app
CMD ["annotate"]
ENTRYPOINT ["/usr/local/bin/npm", "run-script"]

# ENVS: 
# FRESHDESK_USERNAME _PASSWOWRD _URL
# CIVICRM_API_KEY _SITE_KEY _ENDPOINT