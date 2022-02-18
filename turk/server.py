#!/usr/bin/env python3

from http.server import HTTPServer, CGIHTTPRequestHandler

server = HTTPServer(('localhost', 8080), CGIHTTPRequestHandler)
print("Server started at localhost:8080")
try: 
    server.serve_forever()
except KeyboardInterrupt:
    pass

server.server_close()
print("Server closed.")