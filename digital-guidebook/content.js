window.WORKBOOK_COURSE_DATA = {
    id: 'digital-guidebook',
    syncPrefix: 'digitalGuidebook',
    stateVersion: 1,
    strand: 'digital-literacy',
    yearGroup: 7,
    title: 'Digital guidebook',
    shortTitle: 'Digital guidebook',
    intro: 'Work with others to plan, create, and publish a useful digital guidebook.',
    prerequisite: 'No specialist software knowledge is needed. Use trusted sources, follow your school’s sharing rules, and do not enter private information in your saved notes.',
    sourceAttribution: 'Source materials: Digital guidebook, © Oak National Academy 2026, produced in partnership with the Raspberry Pi Foundation. Student explanations, examples, and practice activities are original adaptations.',
    achievements: ['Team Collaborator', 'Project Planner', 'Source Checker', 'File Organiser', 'Guidebook Creator', 'Ready to Publish'],
    lessons: [
        {
            title: 'Collaboration using cloud-based tools',
            summary: 'Explore how people can work together online, and consider the benefits and challenges.',
            sections: [
                { heading: 'Working together online', body: 'Collaboration means working with other people towards a shared task. Cloud-based tools run using the internet, so a group can work on shared documents even when members are not in the same room.' },
                { heading: 'Real-time and turn-taking collaboration', body: 'Some tools let several people edit at the same time. Comments and suggestions can also let a team give feedback without changing the main text straight away. Messages do not always arrive or get answered immediately, so groups need to agree how they will communicate.' },
                { heading: 'Benefits need planning', body: 'Shared work can be easier to access, update, and discuss. It can also be hard to follow many edits, and not everyone has the same device or internet access. Clear roles, agreed deadlines, and respectful messages help a team work well.' },
                { heading: 'Protect shared work', body: 'Sharing a document does not mean everyone should have every permission. Choose who needs access, use the least access needed for the task, and follow your school’s rules. Do not put passwords or private personal details in a shared guidebook.' }
            ],
            example: 'A team can draft separate guidebook sections in one shared document. They can use comments to suggest changes, then agree which suggestions to include.',
            misconception: 'Online collaboration is not automatically easier or fairer. A team still needs good communication, suitable access, and clear decisions.',
            questions: [
                { prompt: 'What makes a task collaborative?', choices: ['People work together towards a shared goal', 'One person finishes it without sharing', 'Everyone uses a different final document'], answer: 0 },
                { prompt: 'Why might a team use comments on a shared document?', choices: ['To give feedback without immediately replacing the main text', 'To make a document private from its owner', 'To remove the need to check changes'], answer: 0 },
                { prompt: 'What is a sensible way to manage access to shared work?', choices: ['Give each person only the access needed for their role', 'Give every viewer full editing access', 'Share the link publicly by default'], answer: 0 }
            ],
            project: {
                title: 'Make a collaboration agreement',
                intro: 'Plan how a small team could communicate and share a guidebook draft safely.',
                fields: [
                    { key: 'roles', label: 'Name two useful team roles and what each person will do.', placeholder: 'For example, one person checks sources...' },
                    { key: 'communication', label: 'How will the team share updates and give feedback?', placeholder: 'Choose a clear way to communicate...' },
                    { key: 'safety', label: 'What access or privacy rule should the team follow?', placeholder: 'Think about permissions and private information...' }
                ]
            }
        },
        {
            title: 'Planning a digital guidebook',
            summary: 'Use a project lifecycle, success criteria, and a planning document to prepare a team project.',
            sections: [
                { heading: 'Follow a project lifecycle', body: 'A project lifecycle gives a team stages to work through: initiation, planning, execution, review, and closure. The stages help people understand what needs to happen and when; teams may return to an earlier stage when they discover something needs to change.' },
                { heading: 'Start with the brief', body: 'During initiation, the team works out the aim, audience, and limits of the project. A clear brief helps everyone understand what the product is for before they start making it.' },
                { heading: 'Write useful success criteria', body: 'Success criteria describe how the team will know that its product meets the brief. They should be specific enough to check, such as “each section has a clear heading” or “the information is supported by a reliable source”. They are more useful than a vague target such as “make it good”.' },
                { heading: 'Choose a planning tool', body: 'A mind map can help generate and organise ideas. A mood board collects visual ideas such as colours and styles. A storyboard shows a sequence, while a visualisation shows the planned appearance of a product. Choose a tool that helps with the decisions your team needs to make.' }
            ],
            example: 'For a local-area guidebook, one criterion could be: “Every place described has a short, factual description and a source that the team has checked.”',
            misconception: 'Planning is not just deciding what the finished product will look like. A useful plan also sets an aim, shares responsibilities, and explains how success can be checked.',
            questions: [
                { prompt: 'Which stage comes after planning in the project lifecycle?', choices: ['Execution', 'Closure', 'Initiation'], answer: 0 },
                { prompt: 'Which is the most checkable success criterion?', choices: ['Each section has a heading and a checked source', 'The guidebook is really nice', 'Everyone likes every page'], answer: 0 },
                { prompt: 'Which planning tool is designed to show a sequence of events or screens?', choices: ['Storyboard', 'Mood board', 'File name'], answer: 0 }
            ],
            project: {
                title: 'Plan a guidebook',
                intro: 'Draft a short plan for a guidebook your team could make. Use a fictional or general topic rather than personal details.',
                fields: [
                    { key: 'aim', label: 'Who is the guidebook for, and what should it help them do?', placeholder: 'State the audience and purpose...' },
                    { key: 'criteria', label: 'Write two specific success criteria.', placeholder: 'Make each one possible to check...' },
                    { key: 'tool', label: 'Which planning tool would help your team most, and why?', placeholder: 'Choose a mind map, mood board, storyboard, or visualisation...' }
                ]
            }
        },
        {
            title: 'Finding reliable information',
            summary: 'Check the source, accuracy, date, and balance of information before using it.',
            sections: [
                { heading: 'Reliable information can be trusted', body: 'Reliable information is trustworthy and accurate. Information can become out of date, and a source may present only one side of a topic, so check more than whether a page looks professional.' },
                { heading: 'Check the source and evidence', body: 'Find out who created the information and why. Look for evidence or references, check when it was updated, and compare important claims with other trustworthy sources. If sources disagree, explain the uncertainty instead of presenting a guess as a fact.' },
                { heading: 'Select images and other assets carefully', body: 'An asset is a resource such as a photo, illustration, logo, or video. The person who created it may own its copyright. A Creative Commons licence can give permission to reuse work under stated conditions; some licences require credit, and some limit commercial use. Check the exact licence and follow its conditions before reusing an asset.' },
                { heading: 'Record credit as you research', body: 'Keep a note of the creator, title, source, and licence for each asset you plan to use. Do not assume that an image is free to copy just because a search engine displays it. If you cannot confirm permission, choose a different asset or ask a teacher for help.' }
            ],
            example: 'Before using a photograph, check who published it, whether the page explains where it came from, whether the details are current, and what reuse permission the creator gave.',
            misconception: 'A search result, popular post, or attractive image is not proof that the information is accurate or that the asset is free to reuse.',
            questions: [
                { prompt: 'Which action is most useful when checking a factual claim?', choices: ['Compare it with other trustworthy sources', 'Use it because it appears near the top of a search', 'Trust it if the page has colourful graphics'], answer: 0 },
                { prompt: 'Why should you check when information was updated?', choices: ['It may no longer be accurate or current', 'It tells you that the author owns every image', 'It proves that the page is unbiased'], answer: 0 },
                { prompt: 'What should you do before reusing a Creative Commons image?', choices: ['Check the licence conditions and give any required credit', 'Assume every licence allows every use', 'Remove the creator’s name'], answer: 0 }
            ],
            project: {
                title: 'Evaluate a source and an asset',
                intro: 'Use a safe, non-personal example source or describe a hypothetical one. Do not paste private information or unlicensed images into your notes.',
                fields: [
                    { key: 'source', label: 'Who created the information, and what evidence supports it?', placeholder: 'Describe the source and evidence...' },
                    { key: 'currency', label: 'How would you check whether the information is current and balanced?', placeholder: 'Name checks or comparisons you would make...' },
                    { key: 'licence', label: 'What would you record before reusing an image?', placeholder: 'Include creator, source, and licence conditions...' }
                ]
            }
        },
        {
            title: 'Saving, sharing, and staying organised',
            summary: 'Use online storage, file organisation, permissions, and version history carefully.',
            sections: [
                { heading: 'Online storage', body: 'Cloud storage keeps files on internet-connected services so people with permission can access them from different devices. It can make collaboration and backups easier, but access depends on accounts, connectivity, and the service being available.' },
                { heading: 'Organise files so they can be found', body: 'Use a folder structure that matches the project and choose descriptive file names. Names with a topic and date or version are easier to recognise than names such as “final-final-new”. Agreeing a shared structure helps everyone save work in the right place.' },
                { heading: 'Use permissions and version history', body: 'Permissions control who can view, comment on, or edit a file. Give people the access they need for their role. Version history records changes over time and may help a team see what changed or restore an earlier version, but it does not replace checking a document carefully.' },
                { heading: 'Keep shared work safe', body: 'Use your own school account and follow your school’s storage rules. Avoid public links unless a teacher has approved them. A clear file name should help people find a document without including sensitive information about a person.' }
            ],
            example: 'A team could use a folder called “Guidebook” with subfolders for “Research”, “Drafts”, and “Images”, then name a draft “Transport-section-v1”.',
            misconception: 'Saving a file in the cloud does not make it public, and it does not mean every person should be allowed to edit it.',
            questions: [
                { prompt: 'What is one benefit of cloud storage?', choices: ['An authorised person can access a file from different connected devices', 'It removes the need for passwords', 'It guarantees that a file is always correct'], answer: 0 },
                { prompt: 'Which file name is easiest for a team to understand?', choices: ['Transport-section-v1', 'new-new-final', 'doc3'], answer: 0 },
                { prompt: 'What can version history help a team do?', choices: ['Review earlier changes to a file', 'Prove every statement is accurate', 'Replace the need for access permissions'], answer: 0 }
            ],
            project: {
                title: 'Design a shared folder system',
                intro: 'Create a simple, safe organisation plan for a team’s guidebook files.',
                fields: [
                    { key: 'folders', label: 'Suggest three folders and explain what belongs in each.', placeholder: 'Keep the structure easy to understand...' },
                    { key: 'filename', label: 'Write a descriptive file name for one draft.', placeholder: 'Include the section and a version...' },
                    { key: 'permissions', label: 'Who should be able to view or edit the draft?', placeholder: 'Match permissions to team roles...' }
                ]
            }
        },
        {
            title: 'Creating a digital guidebook',
            summary: 'Work as a team to create clear content, then review it and use feedback to improve it.',
            sections: [
                { heading: 'Turn the plan into a product', body: 'During execution, the team creates the guidebook using its brief, success criteria, and plan. Divide work so each person knows their task, and use the agreed shared files so sections can be brought together.' },
                { heading: 'Write for the audience', body: 'Use clear headings and concise explanations. Include relevant facts and check them against reliable sources. Keep the layout consistent so readers can find information, and give credit for any reused assets according to their licences.' },
                { heading: 'Review against the criteria', body: 'Review means checking work and deciding what should be improved. Compare the draft with each success criterion. Check that facts are supported, the layout is understandable, and all planned sections are present.' },
                { heading: 'Give useful feedback', body: 'Helpful feedback is specific, respectful, and focused on the work. Explain what is clear and suggest a practical change. A suggestion can be discussed before anyone edits the shared document; the team remains responsible for deciding what to change.' }
            ],
            example: 'Instead of “This page is bad”, try “The opening sentence is clear; could you add the source for the opening time so readers can check it?”',
            misconception: 'Review is not only proofreading at the end. Checking the work against the plan during creation can reveal changes while there is still time to make them.',
            questions: [
                { prompt: 'What should a team use to check whether its guidebook meets the brief?', choices: ['Its success criteria', 'The number of colours on the page', 'The file name alone'], answer: 0 },
                { prompt: 'Which feedback is most useful?', choices: ['A specific, respectful suggestion linked to the work', 'A personal comment about the writer', 'A vague message that says nothing is good'], answer: 0 },
                { prompt: 'Why should guidebook facts be checked against sources?', choices: ['To make sure claims are supported and accurate', 'To make the file size smaller', 'To give every person editing access'], answer: 0 }
            ],
            project: {
                title: 'Draft and review a guidebook section',
                intro: 'Plan a short section for a general audience. Keep it factual, cite the source you would check, and do not include personal data.',
                fields: [
                    { key: 'section', label: 'What is the section about, and what should readers learn?', placeholder: 'Write a short section purpose...' },
                    { key: 'source', label: 'What reliable source would you check for its facts?', placeholder: 'Name a source type or a source you can verify...' },
                    { key: 'feedback', label: 'Write one respectful improvement suggestion for a draft.', placeholder: 'Make it specific and focused on the work...' }
                ]
            }
        },
        {
            title: 'Publishing a digital guidebook',
            summary: 'Complete pre-publication checks and set appropriate access before sharing a finished product.',
            sections: [
                { heading: 'Check before publishing', body: 'Publishing makes a digital product available for other people to view or use. Before sharing it, check spelling, grammar, formatting, and whether the facts and sources are correct. Repair broken links and confirm that the intended audience can understand the information.' },
                { heading: 'Check accessibility', body: 'Make content usable in different ways. Use clear headings and readable contrast. Add meaningful alternative text to informative images so a person using a screen reader can understand their purpose. Captions or subtitles can help people access spoken information in a video.' },
                { heading: 'Set access controls', body: 'Access controls decide who can open or change a file. An owner or administrator usually has the most control; editors can make changes, and viewers can read without editing. Choose the smallest audience and the least powerful permission that still meets the purpose.' },
                { heading: 'Publish only approved content', body: 'Check that you have permission to share the information and assets. Remove private details, test the sharing settings, and follow your teacher’s instructions. A guidebook for a class may need restricted access rather than a public link.' }
            ],
            example: 'Before sharing a class guidebook, a team can check each fact and image credit, test that headings and alternative text make sense, then give classmates view access instead of edit access.',
            misconception: 'Publishing is not just pressing a share button. The team should check accuracy, accessibility, permissions, and privacy before anyone receives the link.',
            questions: [
                { prompt: 'What does alternative text do?', choices: ['Describes an informative image in text', 'Changes who can edit a file', 'Checks the spelling of a heading'], answer: 0 },
                { prompt: 'Which permission is usually suitable for someone who only needs to read a finished guidebook?', choices: ['Viewer', 'Owner', 'Editor'], answer: 0 },
                { prompt: 'What should happen before a guidebook is published?', choices: ['Check its accuracy, accessibility, permissions, and private information', 'Make the sharing link public by default', 'Remove all source credits'], answer: 0 }
            ],
            project: {
                title: 'Make a pre-publication checklist',
                intro: 'Create a short final check for a guidebook before it is shared with its intended readers.',
                fields: [
                    { key: 'quality', label: 'List two checks for writing, facts, or formatting.', placeholder: 'Think about accuracy and presentation...' },
                    { key: 'accessibility', label: 'What will you check to make the guidebook accessible?', placeholder: 'Consider headings, contrast, descriptions, or captions...' },
                    { key: 'sharing', label: 'Who should have access, and what permission should they get?', placeholder: 'Choose an audience and suitable access level...' }
                ]
            }
        }
    ]
};
