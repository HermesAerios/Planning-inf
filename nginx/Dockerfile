FROM nginx:alpine

# Remove default nginx config
RUN rm /etc/nginx/conf.d/default.conf

# Copy custom config
COPY nginx.conf /etc/nginx/nginx.conf

# Create directory for certs (they will be mounted or copied)
RUN mkdir -p /etc/nginx/certs
