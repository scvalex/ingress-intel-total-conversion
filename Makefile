all: local

.PHONY: all local p build deploy clean

local:
	./build.py local

p:
	permamake.sh plugins/*.js

clean:
	rm -rf build/

deploy:
	scp build/local/plugins/portals-details.user.js rusty:/src/pub/
