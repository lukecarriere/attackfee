# Attackfee: Express contact form

One protected form on Express. Page views stay free. A post without a pass gets 403.

export ATTACKFEE_SECRET="any-string-of-16-or-more-characters"
npm install
npm start

Open http://localhost:8787 and send the form. It goes through.
Then try it the way a script would:

curl -i -X POST http://localhost:8787/contact -d "message=hi"

You get 403 and attackfee_required. Add -H "Attackfee-Client: agent" and you get JSON with a work challenge.

Payments are off in this example. See https://attackfee.dev/docs/server for the full setup.
