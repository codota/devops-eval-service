FROM node:18-alpine

WORKDIR /app

# Copy package files
COPY package.json yarn.lock ./

# Install dependencies
RUN yarn install --frozen-lockfile

# Copy source code
COPY . .

# Build the application
RUN yarn build

# Remove dev dependencies
RUN yarn install --frozen-lockfile --production=true && yarn cache clean

EXPOSE 3000

CMD ["yarn", "start"]