EXTENSION_SRC = extension
SCHEMA_DIR = $(EXTENSION_SRC)/schemas
TEST_DIR = tests
EXTENSION_UUID = switch-layout-tiling@shimamu.github.com
EXTENSION_DIR = ~/.local/share/gnome-shell/extensions/$(EXTENSION_UUID)
MRT_DCONF_PATH := /org/gnome/shell/extensions/switch-layout-tiling/
LOCALE_DIR = $(EXTENSION_SRC)/locale
POT_FILE = $(LOCALE_DIR)/switch-layout-tiling.pot

.PHONY: all setup lint lint-fix test test-v \
        compile-schemas compile-locales update-po-files \
        install dconf-list reset-dconf \
        tags tree-js wc-js list-class clean

# Default
all: lint test

# Setup
setup:
	npm install

# Development
lint:
	npx eslint $(EXTENSION_SRC)

lint-fix:
	npx eslint . --fix

test:
	npx vitest

test-v:
	npx vitest --reporter=verbose

# Build
compile-schemas: $(SCHEMA_DIR)/*.gschema.xml
	glib-compile-schemas $(SCHEMA_DIR)

compile-locales:
	$(foreach file, $(wildcard $(LOCALE_DIR)/*/LC_MESSAGES/*.po), \
		msgfmt $(file) -o $(subst .po,.mo,$(file));)

# Translation
update-po-files:
	xgettext -L JavaScript --from-code=UTF-8 -k_ -kN_ \
		-o $(POT_FILE) $(shell find $(EXTENSION_SRC) -type f -name "*.js")
	$(foreach file, $(wildcard $(LOCALE_DIR)/*/LC_MESSAGES/*.po), \
		msgmerge $(file) $(POT_FILE) -o $(file);)

# Install
install:
	mkdir -p $(EXTENSION_DIR)
	cp -r $(EXTENSION_SRC)/* $(EXTENSION_DIR)

install-build: compile-schemas compile-locales
	$(MAKE) install

# Configuration
dconf-list:
	dconf list $(MRT_DCONF_PATH)

reset-dconf:
ifndef KEY
	$(error Please specify KEY, e.g., make reset-dconf KEY=layouts)
endif
	@read -p "Are you sure you want to delete this key? Type 'y' to delete or just press Enter to cancel: " answer; \
	if [ "$$answer" = "y" ]; then \
		dconf reset $(MRT_DCONF_PATH)$(KEY); \
		echo "Key '$(KEY)' has been reset."; \
	else \
		echo "Deletion cancelled."; \
	fi

# Utility
tags:
	ctags -R $(EXTENSION_SRC) $(TEST_DIR)

tree-js:
	tree -P "*.js" --prune $(EXTENSION_SRC) $(TEST_DIR)

wc-js:
	find $(EXTENSION_SRC) -type f -name "*.js" | xargs wc -l

list-class:
	@find $(EXTENSION_SRC) -type f -name "*.js" \
		| xargs grep -E "(^| )class " \
		| sed -E 's|^(.*):.*class ([A-Za-z0-9_]+).*|\1:\2|' \
		| sort \
		| awk -F: '\
			{ \
				if ($$1 != prev) { \
					if (NR > 1) print ""; \
					print $$1; \
					prev = $$1; \
				} \
				print "  - " $$2; \
			} \
		'

# Cleanup
clean:
	rm -rf tags $(SCHEMA_DIR)/gschemas.compiled node_modules
