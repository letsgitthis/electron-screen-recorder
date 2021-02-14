const { desktopCapturer, remote } = require('electron');
const { writeFile } = require('fs');
const { dialog, Menu } = remote;

// Global state
let mediaRecorder; // MediaRecorder instance to capture footage
const recordedChunks = [];

// Buttons
const videoElement = document.querySelector('video');

// When the start button is clicked on, it starts the mediaRecording function,
// but also changes the class of the button by adding a style change,
// as well as changing the inner text of the button to say "Recording."
const startBtn = document.getElementById('startBtn');
startBtn.onclick = e => {
    mediaRecorder.start();
    startBtn.classList.add('red');
    startBtn.innerText = 'Recording';
};

// When the stop button is clicked on, it stops the mediaRecording function,
// and changes the class color and name of the Recording button back to Start.
const stopBtn = document.getElementById('stopBtn');
stopBtn.onclick = e => {
    mediaRecorder.stop();
    startBtn.classList.remove('red');
    startBtn.innerText = 'Start';
};

const videoSelectBtn = document.getElementById('videoSelectBtn');
videoSelectBtn.onclick = getVideoSources;

// Running the function to select a screen doesn't automatically know what's
// available, so we make a promise and use Electron to see what is available
// by getting the sources. On the next loop, the sources are presented
// as a popout menu, and you are able to select which source by clicking.
async function getVideoSources() {
    const inputSources = await desktopCapturer.getSources({
        types: ['window', 'screen']
    });

    const videoOptionsMenu = Menu.buildFromTemplate(
        inputSources.map(source => {
            return {
                label: source.name,
                click: () => selectSource(source)
            };
        })
    );

    videoOptionsMenu.popup();
}

// The app also doesn't automatically know which source to use.
// So we make a promise to manually select from the available sources
// telling our function which source to use when selected.
async function selectSource(source) {
    videoSelectBtn.innerText = source.name;

    const constraints = {
        audio: false,
        video: {
            mandatory: {
                chromeMediaSource: 'desktop',
                chromeMediaSourceId: source.id
            }
        }
    };


    // Create a Stream
    // Once the promise is made and a source is selected to use
    // we use it to create a stream that is placed in the video element
    // in the HTML. Anything streamed during the start/stop function
    // is stored as a video file.
    const stream = await navigator.mediaDevices
    .getUserMedia(constraints);

    // Preview the source in a video element
    videoElement.srcObject = stream;
    videoElement.play();

    // Create the Media Recorder
    const options = { mimeType: 'video/webm; codecs=vp9' };
    mediaRecorder = new MediaRecorder(stream, options);

    // Register Event Handlers
    mediaRecorder.ondataavailable = handleDataAvailable;
    mediaRecorder.onstop = handleStop;
}

// Captures all recorded chunks
// When recording stops, we need handle the data as an array
function handleDataAvailable(e) {
    console.log('video data available');
    recordedChunks.push(e.data);
}

// Saves the video file on stop 
// The function doesn't automatically have a video file to save and is
// waiting for one to be available. Once available, it goes through the
// somewhat confusing blob process of sending the data where it can be saved
// and giving the data a name "vid-dateRecorded.filetype"
async function handleStop(e) {
    const blob = new Blob(recordedChunks, {
        type: 'video/webm; codecs=vp9'
    });

    const buffer = Buffer.from(await blob.arrayBuffer());

    const { filePath } = await dialog.showSaveDialog({
        buttonLabel: 'Save Video',
        defaultPath: `vid-${Date.now()}.webm`
    });

    console.log(filePath);

    if (filePath) {
        writeFile(filePath, buffer, () => console.log('video saved successfully!'));
    }
}