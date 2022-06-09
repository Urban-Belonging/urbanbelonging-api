FROM node:14.17.1-alpine

#Set working directory to source code root
WORKDIR /usr/src/app
RUN chown node:node /usr/src/app
USER node

#Install dependencies
COPY package.json       .
COPY yarn.lock  .
RUN yarn

#Copy source code
COPY . .

#Compile code
RUN ./node_modules/.bin/tsc

ENV GIT_COMMIT_SHA ${GIT_COMMIT_SHA}

#Expose ports
EXPOSE 1337

#Run npm 
CMD [ "yarn", "start" ]
