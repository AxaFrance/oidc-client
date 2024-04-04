import {Domain, DomainDetails} from "./types.js";
import {defaultDemonstratingProofOfPossessionConfiguration} from "./jwt";

const isDpop= (trustedDomain: Domain[] | DomainDetails) : boolean => {
    if (Array.isArray(trustedDomain)) {
        return false;
    }
    return trustedDomain.demonstratingProofOfPossession ?? false;
}

export const getDpopConfiguration = (trustedDomain: Domain[] | DomainDetails) => {

    if(!isDpop(trustedDomain)) {
        return null;
    }
    
    if (Array.isArray(trustedDomain)) {
        return null;
    }
    
    return trustedDomain.demonstratingProofOfPossessionConfiguration ?? defaultDemonstratingProofOfPossessionConfiguration;
}

export const getDpopOnlyWhenDpopHeaderPresent = (trustedDomain: Domain[] | DomainDetails) => {

    if(!isDpop(trustedDomain)) {
        return null;
    }

    if (Array.isArray(trustedDomain)) {
        return null;
    }

    return trustedDomain.demonstratingProofOfPossessionOnlyWhenDpopHeaderPresent ?? true;
}