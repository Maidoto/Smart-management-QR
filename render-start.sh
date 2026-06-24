#!/bin/sh
set -eu

: "${PORT:=10000}"

sed -i "s/Listen 80/Listen ${PORT}/" /etc/apache2/ports.conf
sed -i "s/<VirtualHost \*:80>/<VirtualHost *:${PORT}>/" /etc/apache2/sites-available/000-default.conf

mkdir -p /var/www/html/data
chown -R www-data:www-data /var/www/html/data

exec apache2-foreground
