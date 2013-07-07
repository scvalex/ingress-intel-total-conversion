all: local

.PHONY: all local p build

local:
	./build.py local

p:
	permamake.sh plugins/*.j

clean:
	rm -rf build/
