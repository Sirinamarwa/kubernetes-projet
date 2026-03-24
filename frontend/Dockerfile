FROM node:20-alpine AS build

WORKDIR /app

COPY package*.json ./
RUN npm install

COPY index.html ./
COPY public ./public
COPY src ./src

ARG VITE_BOOKS_API_URL=http://localhost:3001
ARG VITE_LOANS_API_URL=http://localhost:3002
ENV VITE_BOOKS_API_URL=$VITE_BOOKS_API_URL
ENV VITE_LOANS_API_URL=$VITE_LOANS_API_URL

RUN npm run build

FROM nginx:1.27-alpine

COPY --from=build /app/dist /usr/share/nginx/html

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]
