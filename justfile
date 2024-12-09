# Run the server locally (as would for deploy)
serve:
    bundle exec jekyll serve

# Run a dev server (autoreload on any changes)
dev:
    bundle exec jekyll serve --watch --livereload

# Run the Vale linter on the collection posts, see docs for info on the linter- https://vale.sh/docs
lint:
    vale collections/_posts/

# Sort the Blog's accept words file -- cleans it up after adding in new words
sort-vocab:
    cat ./styles/Vocab/Blog/accept.txt | sort --ignore-case > ./tmp && cp ./tmp ./styles/Vocab/Blog/accept.txt && rm ./tmp
