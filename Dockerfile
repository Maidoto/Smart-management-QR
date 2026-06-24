FROM php:8.3-apache

WORKDIR /var/www/html

COPY . /var/www/html/
COPY render-start.sh /usr/local/bin/render-start.sh

RUN chmod +x /usr/local/bin/render-start.sh \
    && mkdir -p /var/www/html/data \
    && chown -R www-data:www-data /var/www/html/data

EXPOSE 10000

CMD ["render-start.sh"]
