const OpenAI=require('openai');
require('dotenv').config();
const openai=new OpenAI({
    apiKey: process.env.OPENAI_API_KEY
});

// Template sections for proposal
const PROPOSAL_SECTIONS={
    INTRO: "introduction and job understanding",
    EXPERIENCE: "relevant experience and skills",
    APPROACH: "proposed approach and methodology",
    TIMELINE: "timeline and deliverables",
    CLOSING: "closing statement"
};

class ProposalGenerator {
    static async generateSection(job,section,previousContent='') {
        const prompt=this.createPrompt(job,section,previousContent);

        try {
            const completion=await openai.chat.completions.create({
                model: "gpt-4",
                messages: [{
                    role: "system",
                    content: "You are an expert freelancer writing proposals for Upwork jobs. Write in a professional, confident, and engaging tone. Focus on value proposition and specific solutions."
                },{
                    role: "user",
                    content: prompt
                }],
                temperature: 0.7,
                max_tokens: 500
            });

            return completion.choices[0].message.content.trim();
        } catch(error) {
            console.error('Error generating proposal section:',error);
            throw error;
        }
    }

    static createPrompt(job,section,previousContent) {
        const baseContext=`
Job Title: ${job.title}
Description: ${job.description}
Budget: ${job.budget.amount} ${job.budget.type}
Required Skills: ${job.skills.join(', ')}
`;

        switch(section) {
            case PROPOSAL_SECTIONS.INTRO:
                return `${baseContext}
Write an engaging introduction for this job proposal that demonstrates understanding of the project requirements and establishes immediate credibility. Keep it concise and professional.`;

            case PROPOSAL_SECTIONS.EXPERIENCE:
                return `${baseContext}
Previous content: ${previousContent}
Write about relevant experience and skills that match this job's requirements. Focus on specific achievements and how they relate to this project.`;

            case PROPOSAL_SECTIONS.APPROACH:
                return `${baseContext}
Previous content: ${previousContent}
Outline a specific approach for this project. Include methodology, tools, and technologies you'll use. Be specific but concise.`;

            case PROPOSAL_SECTIONS.TIMELINE:
                return `${baseContext}
Previous content: ${previousContent}
Propose a realistic timeline and deliverables for this project. Break it down into phases if appropriate.`;

            case PROPOSAL_SECTIONS.CLOSING:
                return `${baseContext}
Previous content: ${previousContent}
Write a strong closing statement that encourages the client to move forward. Include a call to action.`;

            default:
                throw new Error(`Unknown section: ${section}`);
        }
    }
}

async function generateProposal(job) {
    let proposal='';
    let sections=Object.values(PROPOSAL_SECTIONS);

    for(const section of sections) {
        const sectionContent=await ProposalGenerator.generateSection(job,section,proposal);
        proposal+=sectionContent+'\n\n';
    }

    return {
        fullProposal: proposal.trim(),
        estimatedDuration: job.budget.type==='fixed'? '2 weeks':'Ongoing',
        proposedRate: job.budget.type==='fixed'?
            job.budget.amount:
            `${Math.max(job.budget.amount,35)}/hour`
    };
}

module.exports={
    generateProposal
}; 