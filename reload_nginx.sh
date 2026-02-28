#!/bin/bash
/etc/init.d/nginx reload || service nginx reload || systemctl reload nginx
