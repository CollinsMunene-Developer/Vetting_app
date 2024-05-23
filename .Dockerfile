FROM node:14
#work directory
WORKDIR /usr/src/app

#copying json files
COPY package*.json ./

#installing Dependecies into the project
RUN npm install

#Copying te rest of  the application code
COPY . .

#exposing the port where the app runs
EXPOSE 3000

# command to run application
CMD [ "node","server.js", "candidate.js" ]


