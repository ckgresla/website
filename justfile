# Run the development server locally

serve:
    bundle exec jekyll serve

# Recreate Ponderings with Latest File

ponder:
    bash collections/_projects/assemble_ponderings.sh collections/_projects/raw-ponderings.txt
    