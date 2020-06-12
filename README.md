# Universal Linked List

Universal linked list is decentralised image-board like format for threads
hosted with [IPFS](https://ipfs.io/).

Because of the way IPFS works, once threads are created, they will exist for as
long as someone is hosting them.

## Running an instance

To run an instance, you will need three things:

1. An ipfs node
2. The typescript compiler
3. a relatively recent golang compiler

Then, running it is a matte of typing `make build && make run`. However, this
method will use the default string (`marmelade`) for salting the tripcodes If
you want to achieve better security, you will need to use another salt.

## How it works

Each thread is an [IPLD](https://ipld.io/) linked list-like data structure with
messages as its nodes.

## Data structure

Each message is a node with two items:

- `items` is a pointer(CID) to a list of `MessageItem`

- `next` is a pointer to the node before

This means that with only the hash/CID/pointer of the last message, it is
possible to acquire the rest of the chain (assuming all messages are accessible
through ipfs).

The content of each message is carried in a list of multiple `MessageItem`(those
can be images, audio, timestamps, links, code blocks, etc.). The frontend can
then render those however it likes.

A `MessageItem` is a structure composed of two parts:

- `type` is a string, denotes `data`'s type
- `data` is pretty self explanatory. For a code block, it would be a `{content:
  string, language: string}` pair, for a tripcode, it would be a string, for an
  image, it would be a CID.

## Structure of the app

### Frontend

Everything happens in `frontend/front.ts`. First, the page loads. Then, an ipfs
node is created. If the ipfs extension is installed and `window.ipfs` is
enabled, the application will use it. Otherwise, it will initialize a node on
the browser. Then, the app will request from the backend the thread's hashes.

Each message hash will then be accessed and rendered using the IPFS node, following the chain until.

1. A hash that has already been pulled is pulled again.
2. The node's `next` field is null, we got to the beginning of the thread.

Internally, the application uses `MessageView` to synchronize this process with
the relevant dom updates (this abstraction was created when we updated to an
asynchronous way of showing the thread, so that messages that are cached can be
shown more quickly). This logic lives in `frontend/view.ts`.

#### Displaying messages

The function `itemToTag` is the one that converts each `MessageItem` into an
html tag that will then be inserted into the DOM.

#### Posting Messages

To post a message, a list of `MessageItem`s in JSON format is sent to the
backend. The backend can then deny the message and give a reason (a `{error:
string}` object is sent back).

#### Turning the text area's content into a list of `MessageItem`

Q: If the server accepts a structure and the user enters text, how is it converted
from one into the other?

A: By a filthy hack that uses regular expressions and recursion (see
`frontend/types.ts`)

This means that, while it is very easy to add a new `MessageItem` type (add a
parser and a constructor with the good structure, then write the necessary
`itemToTag` branch), it is impossible to create nested structures and one must
be careful not to embed into patterns triggers for items with a greater parsing
precedence (e.g., inserting any \` into a code block). No escaping system has
been implemented yet.

### Backend

The backend is very light as it does only a couple of simple things:

1. accept, filter and `ipfs.add` new messages
2. salt&hash the tripcode items
3. serve the hashes back.
