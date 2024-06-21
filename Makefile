SHELL   = /bin/bash
TOP    := $(patsubst %/,%,$(abspath $(dir $(lastword $(MAKEFILE_LIST)))))
TARGET  = dist
PUBLIC  = public
VENDOR  = $(PUBLIC)/vendor
SRC     = $(shell find src -type f -regex '.*[.]\(ts\|js\|css\|html\)$$') \
		$(wildcard *.html) \
		manifest.config.ts package.json vite.config.js
RUNNER  = bin/run.py
RUN_URL ?= https://example.com

.PHONY: all build build-public install refresh-extension run
all: install build
	@echo $(SRC)

install: vendor-libs | node_modules

build: vendor-libs $(TARGET)

node_modules:
	@npm install --legacy-peer-deps

$(TARGET): $(SRC) package.json | node_modules
	@npm run build


refresh-extension: ## Extensions Reloader endpoint
	@google-chrome http://reload.extensions
	$(info refreshed extensions)

run: $(TARGET)  ## Load unpacked extension into new chromedriver session
	$(RUNNER) --path $(CURDIR)/$(TARGET) --url $(RUN_URL)


# Vendor libs
SG_LIB      = $(addprefix $(VENDOR)/selectorgadget_combined,.css .js .min.js)
LODASH_LIB  = $(VENDOR)/lodash.custom.js
JQUERY_LIB  = $(VENDOR)/jquery.min.js

.PHONY: vendor-libs
vendor-libs: $(TARGET) $(SG_LIB) # $(LODASH_LIB) $(JQUERY_LIB)

$(VENDOR):
	@mkdir -p "$@"

.INTERMEDIATE: selectorgadget
selectorgadget:
	@git clone --depth=1 https://github.com/cantino/selectorgadget $@

$(SG_LIB): | selectorgadget $(VENDOR)
	@mkdir -p $(@D)
	@cp selectorgadget/build/$(notdir $@) $@

$(LODASH_LIB): | $(VENDOR)
	@npm run build:lodash -- -o "$@"

$(JQUERY_LIB): | $(VENDOR)
	@cp node_modules/jquery/dist/jquery.min.js $@


.PHONY: clean distclean
clean:
	$(RM) -rf *~ selectorgadget

distclean: clean
	$(RM) -rf $$(git ls-files --others --ignored --exclude-standard)
