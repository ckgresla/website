# Run the development server locally
serve:
    bundle exec jekyll serve

# Recreate Ponderings with Latest File
ponder:
    bash scripts/assemble_ponderings.sh _data/raw-ponderings.txt pages/ponderings.md

# Run the Vale linter on the collection posts, see docs for info on the linter- https://vale.sh/docs
lint:
    vale collections/_posts/

# Sort the Blog's accept words file -- cleans it up after adding in new words
sort-vocab:
    cat ./styles/Vocab/Blog/accept.txt | sort --ignore-case > ./tmp && cp ./tmp ./styles/Vocab/Blog/accept.txt && rm ./tmp
