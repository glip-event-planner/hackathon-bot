## Meeting Notes Chatbot for Glip

Meeting Notes bot will upload an audio recording of a meeting to VoiceBase, then send back a transcript to the Glip group.


#### Inspiration
Meeting-notes-bot was inspired by the folks at VoiceBase and RingCentral.

#### What it does
Listens to meetings, and provides written notes to relevant members!

#### How we built it
Our app listens for audio attachments to our Glip bot, and when received, uses VoiceBase to convert speech to text. When finished, the bot sends formatted notes to relevant members.

#### Challenges we ran into
Making API calls to VoiceBase in Node.js was difficult, but we owe our success in part to the immense help of Bryon and David from VoiceBase, and Pawan from RC.

#### Accomplishments that we're proud of
Making the API calls work! Pivoting our project idea at the end of day one, and making it work!

#### What we learned
Better protocols for processing and debugging HTTP requests with tools like requestb.in and JSON Formatter.

#### What's next for meeting-notes-bot
In the future, we wish to implement keywords and user preferences to provide the _ exact _ info they need.

#### Built With
* node.js
* glip
* ringcentral
* voicebase
