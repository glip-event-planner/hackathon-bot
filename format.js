module.exports = {

    format: function(transcript) {
          transcript = transcript.replace('next to the', '');
          transcript = transcript.replace('next to the', '');
          var splitVal = 'Department of'
          var splitTranscript = transcript.split(splitVal);
          var resultTranscriptArr = [];

          for (var i = 1; i < splitTranscript.length; i++) {
               //   Grab first "Note"
               var currNote = splitTranscript[i];
               console.log(currNote);
               //   Split around white space
               var splitCurrNote = currNote.split(' ');
               //   First word is the department, upper case that
               resultTranscriptArr.push('=====\n')
               resultTranscriptArr.push(`${splitCurrNote[1].toUpperCase()}:`);
               resultTranscriptArr.push('\n- ')
               //   Push the rest without alteration
               for (var j = 2; j < splitCurrNote.length; j++) {
                   resultTranscriptArr.push(splitCurrNote[j]);
               }
               resultTranscriptArr.push('\n');
           }

           var resultTranscriptStr = resultTranscriptArr.join(' ');
           return `<(^_^)>    Hi! Here are the notes from today's meeting. :\n${resultTranscriptStr}`;
    }
}
