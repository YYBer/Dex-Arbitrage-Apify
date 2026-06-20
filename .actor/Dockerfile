FROM apify/actor-node:22

COPY package*.json ./
RUN npm --quiet set progress=false \
  && npm install --omit=dev --omit=optional \
  && echo "NPM install finished"

COPY . ./

CMD npm start
