# Run a dev server (rebuilds + reloads on change)
dev:
    hugo server

# Build the site into ./public (as the deploy does)
build:
    hugo --minify

# Pull the latest doodle icons from the iCloud source-of-truth folder
icons:
    rsync -av --delete --include='*.svg' --exclude='*' \
      "/Users/ckg/Library/Mobile Documents/com~apple~CloudDocs/wizardry/Wallpapers & Art/Design/hand-drawn-icons/" \
      assets/doodle-icons/

# Run the Vale linter on the napkins, see docs for info on the linter- https://vale.sh/docs
lint:
    vale content/napkins/

# Sort the Blog's accept words file -- cleans it up after adding in new words
sort-vocab:
    cat ./styles/Vocab/Blog/accept.txt | sort --ignore-case > ./tmp && cp ./tmp ./styles/Vocab/Blog/accept.txt && rm ./tmp
