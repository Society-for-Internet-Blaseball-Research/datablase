FROM node:latest

# Setting working directory. All the path will be relative to WORKDIR
WORKDIR /usr/src/app

# Install dependencies
COPY package.json yarn.lock ./
COPY prisma ./prisma
RUN yarn install --pure-lockfile
RUN npx prisma generate

# Copy source files
COPY . .

# Running the app
CMD [ "yarn", "run", "start" ]
