import {config as dotEnvConfig} from 'dotenv';
import { getFirestore, Timestamp } from 'firebase-admin/firestore';
import { Ceremony } from '../models/ceremony';
import { Participant } from '../models/participant';
import { Queue } from '../models/queue';
import { ErrorResponse } from '../models/request';
import { getCeremony } from './ceremony';

dotEnvConfig();
const DOMAIN: string = process.env.DOMAIN!;
const SECONDS_ALLOWANCE_FOR_CHECKIN = Number(process.env.SECONDS_ALLOWANCE_FOR_CHECKIN!);

export async function getQueue(uid: string): Promise<Queue> {
    const db = getFirestore();
    const raw = await db.collection('ceremonies').doc(DOMAIN).collection('queue').doc(uid).get();
    const data = raw.data() as Queue;
    return data;
}

export async function joinQueue(participant: Participant): Promise<Queue> {
    const db = getFirestore();
    const uid = participant.uid;
    const ceremony = await getCeremony();
    const index = ceremony.highestQueueIndex + 1;
    const queue: Queue = {
        index: index,
        uid: uid,
        status: 'WAITING',
        expectedTimeToStart: getExpectedTimeToStart(ceremony, index),
        checkingDeadline: await getCheckingDeadline(index),
    };
    const ceremonyDB = db.collection('ceremonies').doc(DOMAIN);
    // set new highest queue index
    await ceremonyDB.update({highestQueueIndex: index, waiting: ceremony.waiting + 1});
    // join queue in ceremony
    await ceremonyDB.collection('queue').doc(uid).set(queue);
    // retrieve queue from db with standarized format
    const savedQueue = await getQueue(uid);
    return savedQueue;
}

export async function checkinQueue(participant: Participant): Promise<Queue|ErrorResponse> {
    const uid = participant.uid;
    const queue = await getQueue(uid);
    const ceremony = await getCeremony();
    const index = queue.index;
    if (!queue){
        return <ErrorResponse>{code: -1, message: 'Participant has not joined the queue'};
    }
    if (queue.status !== 'WAITING'){
        console.log('inside status != waiting')
        return queue; // indicates the status in queue (COMPLETED, ABSENT, LEFT)
    }
    //const checkingDeadline = new Date(queue.checkingDeadline._seconds *1000);
    const now = new Date( Date.now() + (SECONDS_ALLOWANCE_FOR_CHECKIN *1000));
    //console.log(checkingDeadline);
    console.log(now)
    if (queue.checkingDeadline < now ){
        console.log('inside checking deadline > now')
        return absentQueue(queue, ceremony);
    }
    if (ceremony.currentIndex !== index){
        console.log('inside current index !== index')
        const db = getFirestore();
        await db.collection('ceremonies').doc(DOMAIN).collection('queue').doc(uid).update({
            expectedTimeToStart: getExpectedTimeToStart(ceremony, index),
            checkingDeadline: await getCheckingDeadline(index),
        });
        const savedQueue = await getQueue(uid);
        return savedQueue;
    }
    // participant is ready to start contribution
    const db = getFirestore();
    await db.collection('ceremonies').doc(DOMAIN).collection('queue').doc(uid).update({status: 'READY'});
    const savedQueue = await getQueue(uid);
    return savedQueue;
}

async function absentQueue(queue: Queue, ceremony: Ceremony): Promise<Queue> {
    const db = getFirestore();
    const ceremonyDB = db.collection('ceremonies').doc(DOMAIN);
    await ceremonyDB.collection('queue').doc(queue.uid).update({status: 'ABSENT'});
    await ceremonyDB.update({waiting: ceremony.waiting - 1});
    queue.status = 'ABSENT';
    return queue;
}

function getExpectedTimeToStart(ceremony: Ceremony, index: number): Date {
    const averageTime = ceremony.averageSecondsPerContribution;
    const currentIndex = ceremony.currentIndex;

    const remainingParticipants = index - currentIndex;
    const remainingTime = remainingParticipants * averageTime * 1000;
    const expectedTimeToStart = new Date( Date.now() + remainingTime);
    return expectedTimeToStart;
}

async function getCheckingDeadline(index: number): Promise<Date> {
    const ceremony = await getCeremony();
    const expectedTimeToStart = getExpectedTimeToStart(ceremony, index);
    const halfOfExpectedTime = ( Date.now() - expectedTimeToStart.getTime() ) / 2;
    const anHour = 60 * 60 * 1000; // minutes * seconds * milliseconds
    if (halfOfExpectedTime < anHour){
        return new Date( Date.now() + halfOfExpectedTime );
    } else {
        return new Date( Date.now() + anHour );
    }
}