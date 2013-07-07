all: local

.PHONY: all local p build

local:
	./build.py local

p:
	permamake.sh plugins/*.js

clean:
	rm -rf build/
