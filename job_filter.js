// Scoring weights for different job aspects
const WEIGHTS={
    BUDGET: 0.3,
    CLIENT_HISTORY: 0.2,
    SKILLS_MATCH: 0.25,
    DESCRIPTION_QUALITY: 0.25
};

// Keywords that indicate good job opportunities
const POSITIVE_KEYWORDS=[
    'javascript','nodejs','react','typescript',
    'full stack','backend','frontend','web development'
];

// Keywords that might indicate problematic jobs
const NEGATIVE_KEYWORDS=[
    'urgent','asap','immediate','quick',
    'cheap','low budget','basic','simple'
];

class JobScorer {
    static scoreBudget(budget) {
        if(!budget.amount) return 0;

        // Score fixed price projects
        if(budget.type==='fixed') {
            if(budget.amount>=1000) return 1;
            if(budget.amount>=500) return 0.7;
            if(budget.amount>=200) return 0.4;
            return 0.2;
        }

        // Score hourly projects
        if(budget.type==='hourly') {
            if(budget.amount>=50) return 1;
            if(budget.amount>=35) return 0.8;
            if(budget.amount>=25) return 0.6;
            if(budget.amount>=15) return 0.4;
            return 0.2;
        }

        return 0;
    }

    static scoreClientHistory(clientInfo) {
        let score=0;

        // Score based on client rating
        if(clientInfo.rating>=4.5) score+=0.4;
        else if(clientInfo.rating>=4.0) score+=0.3;
        else if(clientInfo.rating>=3.5) score+=0.1;

        // Score based on number of reviews
        if(clientInfo.reviews>=10) score+=0.3;
        else if(clientInfo.reviews>=5) score+=0.2;
        else if(clientInfo.reviews>=1) score+=0.1;

        // Score based on total spent
        if(clientInfo.totalSpent>=10000) score+=0.3;
        else if(clientInfo.totalSpent>=5000) score+=0.2;
        else if(clientInfo.totalSpent>=1000) score+=0.1;

        return Math.min(score,1);
    }

    static scoreSkillsMatch(jobSkills) {
        if(!jobSkills||jobSkills.length===0) return 0;

        const matchCount=jobSkills.filter(skill =>
            POSITIVE_KEYWORDS.some(keyword =>
                skill.toLowerCase().includes(keyword)
            )
        ).length;

        return Math.min(matchCount/5,1);
    }

    static scoreDescriptionQuality(description) {
        let score=0;
        const lowerDesc=description.toLowerCase();

        // Check for positive keywords
        const positiveMatches=POSITIVE_KEYWORDS.filter(keyword =>
            lowerDesc.includes(keyword)
        ).length;
        score+=(positiveMatches/POSITIVE_KEYWORDS.length)*0.5;

        // Check for negative keywords
        const negativeMatches=NEGATIVE_KEYWORDS.filter(keyword =>
            lowerDesc.includes(keyword)
        ).length;
        score-=(negativeMatches/NEGATIVE_KEYWORDS.length)*0.3;

        // Check description length
        if(description.length>1000) score+=0.3;
        else if(description.length>500) score+=0.2;
        else if(description.length>200) score+=0.1;

        return Math.max(Math.min(score,1),0);
    }

    static calculateTotalScore(job) {
        const scores={
            budget: this.scoreBudget(job.budget)*WEIGHTS.BUDGET,
            clientHistory: this.scoreClientHistory(job.clientInfo)*WEIGHTS.CLIENT_HISTORY,
            skillsMatch: this.scoreSkillsMatch(job.skills)*WEIGHTS.SKILLS_MATCH,
            descriptionQuality: this.scoreDescriptionQuality(job.description)*WEIGHTS.DESCRIPTION_QUALITY
        };

        return {
            total: Object.values(scores).reduce((a,b) => a+b,0),
            breakdown: scores
        };
    }
}

async function filterJobs(jobs,minimumScore=0.7) {
    const scoredJobs=jobs.map(job => ({
        ...job,
        score: JobScorer.calculateTotalScore(job)
    }));

    return scoredJobs
        .filter(job => job.score.total>=minimumScore)
        .sort((a,b) => b.score.total-a.score.total);
}

module.exports={
    filterJobs
}; 