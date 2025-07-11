#!/bin/sh

# 等待几秒确保服务完全启动
sleep 2

# 启动静态文件服务
serve -s dist -l 3000 --no-clipboard