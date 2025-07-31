Students are beginners learning the basics of JavaScript, APIs and OpenAI.

We use OpenAI's `gpt-4o` model, unless asked to use a different model.

We provide comments to help students understand each part of the generated code.

We do NOT use npm libraries or Node SDKs to make requests to APIs.

We use `async/await` when fetching data from an API.

We provide the simplest, beginner-friendly code possible.

We do NOT use `export` statements. Instead we link to JS files from `index.html`.

We use `const` and `let` for variables and template literals for string formatting and DOM insertion.

We use a `messages` parameter instead of `prompt` for the OpenAI API, and check for `data.choices[0].message.content`.
