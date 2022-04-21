/* eslint-disable react-hooks/exhaustive-deps */
import MicRecorder from 'mic-recorder-to-mp3';
import { Audio } from 'react-loader-spinner';
import { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import { ASSEMBLY_AI_API_KEY } from './utils/keys';

const assembly = axios.create({
  baseURL: 'https://api.assemblyai.com/v2',
  headers: {
    authorization: ASSEMBLY_AI_API_KEY,
    'content-type': 'application/json',
  },
});

function App() {
  //using mic recorder
  const recorder = useRef(null);
  const audioPlayer = useRef(null);
  const [audioFile, setAudioFile] = useState(null);
  const [blob, setBlob] = useState(null);
  //are we recording?
  const [isRecording, setIsRecording] = useState(false);
  //Upload specific information
  const [uploadedURL, setUploadedURL] = useState('');
  //Transcript Information
  const [transcriptID, setTranscriptID] = useState('');
  const [transcriptData, setTranscriptData] = useState('');
  const [transcript, setTranscript] = useState('');
  //loading state
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    recorder.current = new MicRecorder({ bitRate: 128 });
  }, []);

  //to upload audio file once its recorded
  useEffect(() => {
    audioFile &&
      assembly.post('/upload', audioFile).then((res) => {
        setUploadedURL(res.data.upload_url);
      });
    console.log(uploadedURL);
  }, [audioFile]);

  //to get transcript once audio file is uploaded
  const handleSubmitTranscriptId = () => {
    assembly
      .post('/transcript', {
        audio_url: uploadedURL,
      })
      .then((res) => {
        setTranscriptID(res.data.id);
        handleCheckStatus();
      })
      .catch((e) => console.log(e));
  };

  //check status of our transcript so we can then receive data
  const handleCheckStatus = async () => {
    setLoading(true);
    try {
      await assembly.get(`/transcript/${transcriptID}`).then((res) => {
        setTranscriptData(res.data);
      });
    } catch (e) {
      console.log(e);
    }
  };

  //Use an interval to check status of transcript
  useEffect(() => {
    const interval = setInterval(() => {
      if (transcriptData?.status !== 'completed' && loading) {
        handleCheckStatus();
      } else {
        setLoading(false);
        setTranscript(transcriptData.text);
        clearInterval(interval);
      }
    }, 1000);
    return () => clearInterval(interval);
  });

  const startRecording = () => {
    //to make sure that we have browser support
    recorder.current.start().then(() => {
      setIsRecording(true);
    });
  };

  const stopRecording = () => {
    recorder.current
      .stop()
      .getMp3()
      .then(([buffer, blob]) => {
        const file = new File(buffer, 'audio.mp3', {
          type: blob.type,
          lastModified: Date.now(),
        });
        const newBlob = URL.createObjectURL(blob);
        setBlob(newBlob);
        setIsRecording(false);
        setAudioFile(file);
      })
      .catch((e) => console.log(e));
  };

  return (
    <div className='flex flex-col items-center justify-center my-10 space-y-5'>
      <h1 className='text-3xl'>React Spech Recognition App</h1>
      <h3 className='text-2xl'>
        Brought to you by:{' '}
        <a
          className='text-secondary animate-pulse'
          href='https://assemblyai.com'
          target='_blank'
          rel='noreferrer'
        >
          AssemblyAI
        </a>
      </h3>
      <audio ref={audioPlayer} src={blob} controls='controls' />
      <div>
        <button
          disabled={isRecording}
          onClick={startRecording}
          className='bg-blue-500 hover:bg-blue-700 text-white font-bold py-2 px-4 rounded mx-3'
        >
          Record
        </button>
        <button
          disabled={!isRecording}
          onClick={stopRecording}
          className='bg-red-500 hover:bg-red-700 text-white font-bold py-2 px-4 rounded mx-3'
        >
          Stop
        </button>
        <button
          onClick={handleSubmitTranscriptId}
          className='bg-green-400 hover:bg-green-700 text-white font-bold py-2 px-4 rounded mx-3'
        >
          Send
        </button>
      </div>
      {loading ? (
        <>
          <Audio
            color='red'
            secondaryColor='orange'
            height={100}
            width={100}
            strokeWidth={5}
          />
          <p>({transcriptData.status}...)</p>
        </>
      ) : (
        <div />
      )}
      {!loading && transcript && (
        <div className='mockup-code'>
          <p className='p-6'>{transcript}</p>
        </div>
      )}
    </div>
  );
}

export default App;
